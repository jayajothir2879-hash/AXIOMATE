-- supabase/seed.sql
-- Run this AFTER schema.sql, in the Supabase SQL Editor.
-- Seeds business data only. User accounts are created through the app's
-- Sign Up page (or Authentication > Users in the Supabase dashboard) because
-- Supabase Auth manages passwords itself — see README.md "Creating your
-- demo logins" for the exact steps and how to set roles.

insert into public.clients (client_code, name, company, contact_person, email, phone, project_count, active_projects, completed_projects, risk_level) values
  ('CLI-001','Nova Retail Group','Nova Retail Group Inc.','Lena Ford','lena.ford@novaretail.com','+1 212 555 0199',3,2,1,'Medium'),
  ('CLI-002','Brightline Health','Brightline Health Systems','Marcus Idowu','marcus@brightlinehealth.com','+1 617 555 0142',2,1,1,'Low'),
  ('CLI-003','Fenwick & Cole','Fenwick & Cole LLP','Sara Whitfield','sara.w@fenwickcole.com','+1 312 555 0177',2,2,0,'High'),
  ('CLI-004','Orbital Freight','Orbital Freight Logistics','Tom Nguyen','tom.n@orbitalfreight.com','+1 646 555 0188',1,1,0,'Medium'),
  ('CLI-005','Verdant Foods','Verdant Foods Co.','Aisha Rahman','aisha@verdantfoods.com','+1 305 555 0166',2,1,1,'Low')
on conflict (client_code) do nothing;

insert into public.employees (emp_code, name, email, phone, department, designation, assigned_projects, daily_hours, weekly_hours, productivity_score, workload) values
  ('EMP-101','Derek Okafor','pm@axiomate.com','+1 415 555 0121','Delivery','Senior Project Manager','Storefront Revamp, Claims Portal',7,38,91,'High'),
  ('EMP-102','Priya Nandan','employee@axiomate.com','+1 415 555 0134','Engineering','Software Engineer','Storefront Revamp',8,44,76,'Overloaded'),
  ('EMP-103','Liam Chen','liam.chen@axiomate.com','+1 415 555 0145','Engineering','Backend Engineer','Claims Portal, Freight Tracker',8,41,82,'High'),
  ('EMP-104','Sofia Marquez','sofia.m@axiomate.com','+1 415 555 0156','Design','Product Designer','Storefront Revamp',6,30,85,'Medium'),
  ('EMP-105','Noah Petrov','noah.p@axiomate.com','+1 415 555 0167','QA','QA Analyst','Litigation Tracker',3,15,64,'Low'),
  ('EMP-106','Grace Odum','grace.o@axiomate.com','+1 415 555 0178','Engineering','Full Stack Engineer','Farm Yield Dashboard',5,26,79,'Medium'),
  ('EMP-107','Ethan Brooks','ethan.b@axiomate.com','+1 415 555 0189','Data','Data Analyst','Freight Tracker, Farm Yield Dashboard',7,37,73,'High')
on conflict (emp_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-001','Storefront Revamp', c.id, '2026-04-01','2026-07-20',55,'High','Active','Priya Nandan, Sofia Marquez, Derek Okafor','UI redesign phase behind schedule due to asset delays.'
from public.clients c where c.client_code = 'CLI-001'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-002','Loyalty Engine', c.id, '2026-01-10','2026-05-30',100,'Medium','Completed','Grace Odum','Delivered on schedule, positive client feedback.'
from public.clients c where c.client_code = 'CLI-001'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-003','Claims Portal', c.id, '2026-02-15','2026-08-01',62,'High','Active','Derek Okafor, Liam Chen','On track, minor compliance review pending.'
from public.clients c where c.client_code = 'CLI-002'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-004','Patient Intake App', c.id, '2025-10-01','2026-03-01',100,'Medium','Completed','Sofia Marquez','Closed out, in maintenance mode.'
from public.clients c where c.client_code = 'CLI-002'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-005','Litigation Tracker', c.id, '2026-03-01','2026-06-15',38,'High','Delayed','Noah Petrov','Blocked on client data migration, two weeks behind.'
from public.clients c where c.client_code = 'CLI-003'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-006','Contract Vault', c.id, '2026-05-01','2026-09-10',20,'Medium','Active','Ethan Brooks','Early phase, requirements finalization ongoing.'
from public.clients c where c.client_code = 'CLI-003'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-007','Freight Tracker', c.id, '2026-01-20','2026-06-30',47,'High','Delayed','Liam Chen, Ethan Brooks','Integration with carrier API delayed, escalated to vendor.'
from public.clients c where c.client_code = 'CLI-004'
on conflict (project_code) do nothing;

insert into public.projects (project_code, name, client_id, start_date, end_date, progress, priority, status, assigned_employees, remarks)
select 'PRJ-008','Farm Yield Dashboard', c.id, '2026-04-15','2026-08-30',33,'Low','On Hold','Grace Odum, Ethan Brooks','Paused pending client budget approval.'
from public.clients c where c.client_code = 'CLI-005'
on conflict (project_code) do nothing;

insert into public.work_logs (employee_id, log_date, task, hours)
select e.id, '2026-07-01','Storefront checkout flow',8 from public.employees e where e.emp_code = 'EMP-102'
union all
select e.id, '2026-07-01','Claims API integration',7.5 from public.employees e where e.emp_code = 'EMP-103'
union all
select e.id, '2026-07-02','Storefront mobile responsiveness',8 from public.employees e where e.emp_code = 'EMP-102'
union all
select e.id, '2026-07-02','Storefront design QA',6 from public.employees e where e.emp_code = 'EMP-104'
union all
select e.id, '2026-07-02','Freight API debugging',7 from public.employees e where e.emp_code = 'EMP-107'
union all
select e.id, '2026-07-03','Sprint planning + client sync',6 from public.employees e where e.emp_code = 'EMP-101'
union all
select e.id, '2026-07-03','Litigation tracker regression tests',3 from public.employees e where e.emp_code = 'EMP-105';

insert into public.notifications (type, title, message) values
  ('risk','High-Risk Alert','Litigation Tracker flagged High Risk — 38% progress with limited days remaining.'),
  ('warn','Workload Alert','Priya Nandan is overloaded at 44 hrs this week — consider reallocating tasks.'),
  ('update','Project Update','Claims Portal moved to 62% completion after this week''s sprint.'),
  ('warn','Deadline Reminder','Freight Tracker deadline is approaching and currently behind schedule.'),
  ('update','Report Generated','Weekly report was generated and archived.'),
  ('risk','High-Risk Alert','Freight Tracker flagged High Risk due to vendor integration delay.');
