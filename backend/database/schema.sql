-- database/schema.sql
-- AXIOMATE database schema for Supabase (PostgreSQL).
-- Run this once: paste it into Supabase -> SQL Editor -> New query -> Run.
-- (Or via psql: psql "$DATABASE_URL" -f database/schema.sql)

-- ---------------------------------------------------------------------------
-- USERS  (login accounts — Admin / Project Manager / Employee)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  emp_code      VARCHAR(20)  UNIQUE,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'Employee'
                CHECK (role IN ('Admin','Project Manager','Employee')),
  department    VARCHAR(80),
  designation   VARCHAR(100),
  phone         VARCHAR(30),
  join_date     DATE,
  avatar_url    TEXT,
  two_factor    BOOLEAN DEFAULT FALSE,
  reset_token   VARCHAR(255),
  reset_expires TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id                 SERIAL PRIMARY KEY,
  client_code        VARCHAR(20) UNIQUE,
  name               VARCHAR(150) NOT NULL,
  company            VARCHAR(150),
  contact_person     VARCHAR(120),
  email              VARCHAR(150),
  phone              VARCHAR(30),
  project_count      INT DEFAULT 0,
  active_projects    INT DEFAULT 0,
  completed_projects INT DEFAULT 0,
  risk_level         VARCHAR(10) DEFAULT 'Low' CHECK (risk_level IN ('Low','Medium','High')),
  created_at         TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- EMPLOYEES  (workforce records — distinct from login `users`)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                  SERIAL PRIMARY KEY,
  emp_code            VARCHAR(20) UNIQUE,
  name                VARCHAR(120) NOT NULL,
  email               VARCHAR(150),
  phone               VARCHAR(30),
  department          VARCHAR(80),
  designation         VARCHAR(100),
  assigned_projects   TEXT,
  daily_hours         NUMERIC(4,1) DEFAULT 0,
  weekly_hours        NUMERIC(5,1) DEFAULT 0,
  productivity_score  INT DEFAULT 0,
  workload            VARCHAR(15) DEFAULT 'Low' CHECK (workload IN ('Low','Medium','High','Overloaded')),
  user_id             INT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                 SERIAL PRIMARY KEY,
  project_code       VARCHAR(30) UNIQUE,
  name               VARCHAR(150) NOT NULL,
  client_id          INT NULL REFERENCES clients(id) ON DELETE SET NULL,
  start_date         DATE,
  end_date           DATE,
  progress           INT DEFAULT 0,
  priority           VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  status             VARCHAR(15) DEFAULT 'Active' CHECK (status IN ('Active','Completed','Delayed','On Hold')),
  assigned_employees TEXT,
  remarks            TEXT,
  created_at         TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- WORK LOGS  (daily effort tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_logs (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  task        VARCHAR(255),
  hours       NUMERIC(4,1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(10) DEFAULT 'update' CHECK (type IN ('update','warn','risk')),
  title      VARCHAR(150),
  message    TEXT,
  user_id    INT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- REPORTS  (archive of generated weekly reports)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(150),
  content      TEXT,
  generated_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);
