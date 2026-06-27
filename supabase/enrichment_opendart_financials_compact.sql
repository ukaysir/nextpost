with opendart_data(company_id, fiscal_year, revenue, operating_profit, net_income, employee_count, avg_salary, dart_corp_code, stock_code) as (
  values
  (3, 2024, 92187272245, 6043715799, -14463195629, 124, 4870, '00103635', '014200'),
  (4, 2024, 107448752000000, 12667139000000, 9775005000000, 35747, 13700, '00106641', '000270'),
  (10, 2024, 196278875513, 15686295738, 19599490585, 387, 5900, '00111193', '108380'),
  (12, 2024, 17870718495804, 2110200077994, 1381858075058, 18214, 14000, '00113526', '003490'),
  (17, 2024, 16233055000000, 1017600000000, 394689000000, 6174, 9800, '00159616', '034020'),
  (22, 2024, 71488568458, 1818525608, 3819352513, 207, 5500, '00385363', '065450'),
  (26, 2024, 36103058846, -5933203085, -26830278994, 227, 4800, '00288343', '065570'),
  (32, 2024, 27191519908, -5693400709, -1705103424, 57, 7728, '00136165', '013810'),
  (35, 2024, 171279451654, -3072159411, 6249303506, 484, 7900, '00449254', '099320'),
  (37, 2024, 120701833274, 14759928402, 14967379485, 479, 6062, '00612489', '214430'),
  (40, 2024, 54015388404, -2638220380, -2248928417, 111, 5500, '00235183', '044780'),
  (47, 2024, 4587636523, -13377807751, -8089494005, 23, 7600, '01498974', '445680'),
  (48, 2024, 64465673652, 1681951279, -13659251363, 179, 5500, '00145738', '024810'),
  (55, 2024, 6028363775125, -89552863444, 157626660908, 82, 11005, '00152862', '002020'),
  (57, 2024, 207273257566, 4348353305, 10919360117, 398, 6600, '00148522', '010820'),
  (58, 2024, 588377472367, 14061353558, 3833191318, 817, 5600, '00573579', '090080'),
  (59, 2024, 4554411454633, 323768893078, 236045982790, 3698, 9433, '00684714', '103140'),
  (62, 2024, 3633742105840, 240718310400, 170895410977, 5093, 11900, '00309503', '047810'),
  (63, 2024, 139379274208, 8288832921, 6685577427, 140, 5444, '00162832', '024740'),
  (64, 2024, 104776425927, 7488962506, 7335829952, 220, 6500, '00534598', '372910'),
  (65, 2024, 10776004933627, 237876379317, 528212898147, 10202, 9100, '00111704', '042660'),
  (66, 2024, 2803686058274, 219345297682, 445378843124, 4751, 10300, '00339391', '272210'),
  (67, 2024, 11240121484118, 1731878825342, 2539873460538, 7659, 12600, '00126566', '012450'),
  (68, 2024, 4376597857000, 456565534000, 405259414000, 4182, 12600, '00302926', '064350'),
  (69, 2024, 8180886000000, 218810000000, 129472000000, 2937, 12500, '00106623', '011210'),
  (73, 2024, 4894979612220, 362479487133, 222929444192, 3395, 8900, '01316245', '298040'),
  (74, 2024, 230800588043, 9134041295, 10744253181, 359, 6315, '00111421', '005870'),
  (75, 2024, 67765626088000, 2983162778000, 1930179481000, 53, 17163, '01205709', '267250'),
  (76, 2024, 14486453544000, 705223483000, 621509420000, 14537, null, '01390344', '329180'),
  (77, 2024, 1885962000000, 7252000000, 5225000000, 2069, 7422, '00633835', '097230'),
  (78, 2024, 3276339508425, 229779392271, 216648719554, 4789, 9800, '00503668', '079550'),
  (82, 2024, 662615726791, 41797283162, 16871459149, 664, 6778, '00480367', '100090'),
  (83, 2024, 968898049440, 98128121434, 104345991126, 586, 8600, '00398792', '064960'),
  (84, 2024, 614453293151, 110508614595, 96131825495, 431, 7313, '00134477', '003570'),
  (85, 2024, 724609807886, 42236835042, 27215787172, 894, 8200, '00480455', '077970')
), inserted_financials as (
  insert into public.company_financials (company_id, fiscal_year, revenue, operating_profit, net_income, employee_count, avg_salary, notes)
  select company_id, fiscal_year, revenue, operating_profit, net_income, employee_count, avg_salary, 'OpenDART generated annual-report snapshot'
  from opendart_data
  where not exists (
    select 1
    from public.company_financials existing
    where existing.company_id = opendart_data.company_id
      and existing.fiscal_year = opendart_data.fiscal_year
      and existing.notes = 'OpenDART generated annual-report snapshot'
  )
  returning company_id
), upsert_profiles as (
  insert into public.company_profiles (company_id, stock_code, dart_corp_code, employee_count, employee_count_year, avg_salary, avg_salary_year, data_quality_score, updated_at)
  select company_id, nullif(stock_code, ''), dart_corp_code, employee_count, fiscal_year, avg_salary, fiscal_year, 80, now()
  from opendart_data
  on conflict (company_id) do update
    set stock_code = excluded.stock_code,
        dart_corp_code = excluded.dart_corp_code,
        employee_count = excluded.employee_count,
        employee_count_year = excluded.employee_count_year,
        avg_salary = excluded.avg_salary,
        avg_salary_year = excluded.avg_salary_year,
        data_quality_score = greatest(public.company_profiles.data_quality_score, excluded.data_quality_score),
        updated_at = now()
  returning company_id
), updated_companies as (
  update public.companies company
  set avg_salary = data.avg_salary,
      salary_source = 'OpenDART 2024 annual report employee status'
  from opendart_data data
  where company.id = data.company_id
    and data.avg_salary is not null
  returning company.id
)
select
  (select count(*) from opendart_data) as input_rows,
  (select count(*) from inserted_financials) as inserted_financials,
  (select count(*) from upsert_profiles) as upserted_profiles,
  (select count(*) from updated_companies) as updated_companies;
