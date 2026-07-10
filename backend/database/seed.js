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
    await client.query('DELETE FROM outcome_activities');
    await client.query('DELETE FROM project_outcomes');
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
    // Removed dummy clients

    // ---- Employees ----
    const employees = [
      ['EMP-001','Amara James','admin@axiocloudsolutions.com','+1 415 555 0110','Executive','Platform Administrator','',0,0,0,'Low', adminId],
      ['EMP-002','Derek Okafor','pm@axiomate.com','+1 415 555 0121','Delivery','Senior Project Manager','',0,0,0,'Low', pmId],
      ['EMP-003','Priya Nandan','employee@axiomate.com','+1 415 555 0134','Engineering','Software Engineer','',0,0,0,'Low', empId],
    ];
    const empIds = {};
    for (const e of employees) {
      const r = await client.query(
        `INSERT INTO employees (emp_code,name,email,phone,department,designation,assigned_projects,daily_hours,weekly_hours,productivity_score,workload,user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, e);
      empIds[e[0]] = r.rows[0].id;
    }

    // ---- Projects ----
    // Removed dummy projects

    // ---- Outcomes ----
    // Removed dummy outcomes

    // ---- Outcome activities ----
    // Removed dummy activities

    // ---- Work logs ----
    // Removed dummy work logs

    // ---- Notifications ----
    // Removed dummy notifications

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

