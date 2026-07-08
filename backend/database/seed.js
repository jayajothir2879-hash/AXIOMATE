// database/seed.js
// Populates a freshly-created Supabase/Postgres database with demo data.
// Usage: npm run seed   (from the backend/ folder, after schema.sql has been run)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding AXIOMATE database...');
    const pass = await bcrypt.hash('password123', 10);

    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM work_logs');
    await client.query('DELETE FROM projects');
    await client.query('DELETE FROM employees');
    await client.query('DELETE FROM clients');
    await client.query('DELETE FROM users');

    const adminRes = await client.query(
      `INSERT INTO users (emp_code,name,email,password_hash,role,department,designation,phone,join_date)
       VALUES ('EMP-001','Amara James',$1,$2,'Admin','Executive','Platform Administrator','+1 415 555 0110','2021-03-15')
       RETURNING id`,
      ['admin@axiocloudsolutions.com', pass]
    );
    const pmRes = await client.query(
      `INSERT INTO users (emp_code,name,email,password_hash,role,department,designation,phone,join_date)
       VALUES ('EMP-002','Derek Okafor',$1,$2,'Project Manager','Delivery','Senior Project Manager','+1 415 555 0121','2022-01-10')
       RETURNING id`,
      ['pm@axiomate.com', pass]
    );
    const empRes = await client.query(
      `INSERT INTO users (emp_code,name,email,password_hash,role,department,designation,phone,join_date)
       VALUES ('EMP-003','Priya Nandan',$1,$2,'Employee','Engineering','Software Engineer','+1 415 555 0134','2023-06-01')
       RETURNING id`,
      ['employee@axiomate.com', pass]
    );
    const adminId = adminRes.rows[0].id, pmId = pmRes.rows[0].id, empId = empRes.rows[0].id;

    // ---- Clients ----
    const clients = [
      ['CLI-001','Nova Retail Group','Nova Retail Group Inc.','Lena Ford','lena.ford@novaretail.com','+1 212 555 0199',3,2,1,'Medium'],
      ['CLI-002','Brightline Health','Brightline Health Systems','Marcus Idowu','marcus@brightlinehealth.com','+1 617 555 0142',2,1,1,'Low'],
      ['CLI-003','Fenwick & Cole','Fenwick & Cole LLP','Sara Whitfield','sara.w@fenwickcole.com','+1 312 555 0177',2,2,0,'High'],
      ['CLI-004','Orbital Freight','Orbital Freight Logistics','Tom Nguyen','tom.n@orbitalfreight.com','+1 646 555 0188',1,1,0,'Medium'],
      ['CLI-005','Verdant Foods','Verdant Foods Co.','Aisha Rahman','aisha@verdantfoods.com','+1 305 555 0166',2,1,1,'Low'],
    ];
    const clientIds = {};
    for (const c of clients) {
      const r = await client.query(
        `INSERT INTO clients (client_code,name,company,contact_person,email,phone,project_count,active_projects,completed_projects,risk_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, c);
      clientIds[c[0]] = r.rows[0].id;
    }

    // ---- Employees ----
    const employees = [
      ['EMP-001','Amara James','admin@axiocloudsolutions.com','+1 415 555 0110','Executive','Platform Administrator','—',4,20,88,'Medium', adminId],
      ['EMP-002','Derek Okafor','pm@axiomate.com','+1 415 555 0121','Delivery','Senior Project Manager','Storefront Revamp, Claims Portal',7,38,91,'High', pmId],
      ['EMP-003','Priya Nandan','employee@axiomate.com','+1 415 555 0134','Engineering','Software Engineer','Storefront Revamp',8,44,76,'Overloaded', empId],
      ['EMP-004','Liam Chen','liam.chen@axiomate.com','+1 415 555 0145','Engineering','Backend Engineer','Claims Portal, Freight Tracker',8,41,82,'High', null],
      ['EMP-005','Sofia Marquez','sofia.m@axiomate.com','+1 415 555 0156','Design','Product Designer','Storefront Revamp',6,30,85,'Medium', null],
      ['EMP-006','Noah Petrov','noah.p@axiomate.com','+1 415 555 0167','QA','QA Analyst','Litigation Tracker',3,15,64,'Low', null],
      ['EMP-007','Grace Odum','grace.o@axiomate.com','+1 415 555 0178','Engineering','Full Stack Engineer','Farm Yield Dashboard',5,26,79,'Medium', null],
      ['EMP-008','Ethan Brooks','ethan.b@axiomate.com','+1 415 555 0189','Data','Data Analyst','Freight Tracker, Farm Yield Dashboard',7,37,73,'High', null],
    ];
    const empIds = {};
    for (const e of employees) {
      const r = await client.query(
        `INSERT INTO employees (emp_code,name,email,phone,department,designation,assigned_projects,daily_hours,weekly_hours,productivity_score,workload,user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, e);
      empIds[e[0]] = r.rows[0].id;
    }

    // ---- Projects ----
    const projects = [
      ['PRJ-001','Storefront Revamp','CLI-001','2026-04-01','2026-07-20',55,'High','Active','Priya Nandan, Sofia Marquez, Derek Okafor','UI redesign phase behind schedule due to asset delays.'],
      ['PRJ-002','Loyalty Engine','CLI-001','2026-01-10','2026-05-30',100,'Medium','Completed','Grace Odum','Delivered on schedule, positive client feedback.'],
      ['PRJ-003','Claims Portal','CLI-002','2026-02-15','2026-08-01',62,'High','Active','Derek Okafor, Liam Chen','On track, minor compliance review pending.'],
      ['PRJ-004','Patient Intake App','CLI-002','2025-10-01','2026-03-01',100,'Medium','Completed','Sofia Marquez','Closed out, in maintenance mode.'],
      ['PRJ-005','Litigation Tracker','CLI-003','2026-03-01','2026-06-15',38,'High','Delayed','Noah Petrov','Blocked on client data migration, two weeks behind.'],
      ['PRJ-006','Contract Vault','CLI-003','2026-05-01','2026-09-10',20,'Medium','Active','Ethan Brooks','Early phase, requirements finalization ongoing.'],
      ['PRJ-007','Freight Tracker','CLI-004','2026-01-20','2026-06-30',47,'High','Delayed','Liam Chen, Ethan Brooks','Integration with carrier API delayed, escalated to vendor.'],
      ['PRJ-008','Farm Yield Dashboard','CLI-005','2026-04-15','2026-08-30',33,'Low','On Hold','Grace Odum, Ethan Brooks','Paused pending client budget approval.'],
    ];
    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (project_code,name,client_id,start_date,end_date,progress,priority,status,assigned_employees,remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p[0], p[1], clientIds[p[2]], p[3], p[4], p[5], p[6], p[7], p[8], p[9]]
      );
    }

    // ---- Work logs ----
    const logs = [
      [empIds['EMP-003'],'2026-07-01','Storefront checkout flow',8],
      [empIds['EMP-004'],'2026-07-01','Claims API integration',7.5],
      [empIds['EMP-003'],'2026-07-02','Storefront mobile responsiveness',8],
      [empIds['EMP-005'],'2026-07-02','Storefront design QA',6],
      [empIds['EMP-008'],'2026-07-02','Freight API debugging',7],
      [empIds['EMP-002'],'2026-07-03','Sprint planning + client sync',6],
      [empIds['EMP-006'],'2026-07-03','Litigation tracker regression tests',3],
    ];
    for (const l of logs) {
      await client.query(`INSERT INTO work_logs (employee_id, log_date, task, hours) VALUES ($1,$2,$3,$4)`, l);
    }

    // ---- Notifications ----
    const notifs = [
      ['risk','High-Risk Alert','Litigation Tracker flagged High Risk — 38% progress with limited days remaining.'],
      ['warn','Workload Alert','Priya Nandan is overloaded at 44 hrs this week — consider reallocating tasks.'],
      ['update','Project Update',"Claims Portal moved to 62% completion after this week's sprint."],
      ['warn','Deadline Reminder','Freight Tracker deadline is approaching and currently behind schedule.'],
      ['update','Report Generated','Weekly report was generated and archived.'],
      ['risk','High-Risk Alert','Freight Tracker flagged High Risk due to vendor integration delay.'],
    ];
    for (const n of notifs) {
      await client.query(`INSERT INTO notifications (type,title,message) VALUES ($1,$2,$3)`, n);
    }

    console.log('✅  Seed complete.');
    console.log('   Login with: admin@axiocloudsolutions.com / password123 (Admin)');
    console.log('               pm@axiomate.com / password123 (Project Manager)');
    console.log('               employee@axiomate.com / password123 (Employee)');
  } catch (err) {
    console.error('❌  Seed failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
