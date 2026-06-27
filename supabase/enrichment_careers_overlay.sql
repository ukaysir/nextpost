-- Official/company-controlled careers enrichment for companies that still lack careers URLs.
-- Generated as a hand-curated overlay because the current Supabase MCP connection is read-only.

insert into public.company_profiles (
  company_id,
  verified_name,
  homepage_url,
  careers_page_url,
  main_products,
  summary,
  data_quality_score,
  updated_at
)
values
  (
    35,
    '쎄트렉아이',
    'https://www.satreci.com/',
    'https://satreci.careerlink.kr/',
    array['위성시스템', '위성영상', '지상체', '항공우주']::text[],
    '위성시스템과 지상체, 위성영상 활용 서비스를 다루는 항공우주 기업입니다.',
    76,
    now()
  ),
  (
    64,
    '한컴라이프케어',
    'https://www.hancomlifecare.com/',
    'https://www.hancomlifecare.com/user/bbs/list.do?bbsId=recruitment',
    array['개인안전장비', '방독면', '소방장비', '국방 안전장비']::text[],
    '소방, 산업, 국방 분야 개인안전장비와 화생방 보호 장비를 제조하는 기업입니다.',
    78,
    now()
  ),
  (
    73,
    '효성중공업',
    'https://www.hyosungheavyindustries.com/',
    'https://www.hyosungheavyindustries.com/kr/company/recruitment/personnel-system',
    array['전력기기', '전동기', '발전기', '함정 전기체계']::text[],
    '전력기기와 중전기 솔루션을 기반으로 함정 전기체계와 산업 인프라 사업을 수행하는 기업입니다.',
    72,
    now()
  )
on conflict (company_id) do update
  set verified_name = coalesce(public.company_profiles.verified_name, excluded.verified_name),
      homepage_url = coalesce(public.company_profiles.homepage_url, excluded.homepage_url),
      careers_page_url = coalesce(public.company_profiles.careers_page_url, excluded.careers_page_url),
      main_products = case
        when public.company_profiles.main_products = '{}' then excluded.main_products
        else public.company_profiles.main_products
      end,
      summary = coalesce(public.company_profiles.summary, excluded.summary),
      data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
      updated_at = now();

update public.companies c
set careers_page_url = p.careers_page_url
from public.company_profiles p
where p.company_id = c.id
  and c.id in (35, 64, 73)
  and c.careers_page_url is null
  and p.careers_page_url is not null;

insert into public.job_postings (
  company_id,
  title,
  job_function,
  employment_type,
  experience_level,
  preferred_military_experience,
  required_skills,
  preferred_skills,
  location,
  posted_at,
  deadline_at,
  posting_url,
  is_active,
  raw
)
values
  (
    64,
    '국방 개발부문 개발자',
    '국방 장비 연구개발',
    '정규직',
    '경력',
    '국방사업·장비 개발 경험',
    array['기구설계', 'HW', 'SW', '펌웨어']::text[],
    array['국방사업 이해', '개인안전장비 개발']::text[],
    '경기 용인',
    null,
    null,
    'https://www.hancomlifecare.com/user/bbs/detail.do?bbsId=job&bbsSeq=300&cPage=1',
    null,
    '{"source":"official_company_recruitment_board"}'::jsonb
  ),
  (
    64,
    '소방영업 경력직',
    '소방·공공 영업',
    '정규직',
    '경력',
    '공공기관 대응·장비 운용 경험',
    array['공공영업', '채널관리', '제품 소싱']::text[],
    array['동종업계 경험', '커뮤니케이션']::text[],
    '경기 용인',
    '2026-04-24',
    '2026-06-25',
    'https://www.hancomlifecare.com/user/bbs/detail.do?bbsId=job&bbsSeq=335&cPage=1',
    false,
    '{"source":"official_company_recruitment_board"}'::jsonb
  ),
  (
    35,
    '쎄트렉아이 채용 홈페이지',
    '항공우주 SW/HW/품질 직무',
    '공고별 확인',
    '신입/경력',
    '위성·항공우주·통신전자 운용 경험',
    array['임베디드', '위성 관제', '광학', '품질관리']::text[],
    array['항공우주 도메인 이해']::text[],
    '공고별 확인',
    null,
    null,
    'https://satreci.careerlink.kr/',
    null,
    '{"source":"official_recruitment_homepage"}'::jsonb
  )
on conflict do nothing;
