-- Keep company_profiles URL fields aligned with verified company-level URLs.

begin;

update public.company_profiles profile
set careers_page_url = company.careers_page_url,
    updated_at = now()
from public.companies company
where profile.company_id = company.id
  and profile.careers_page_url is null
  and company.careers_page_url is not null;

commit;
