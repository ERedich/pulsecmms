CREATE TABLE IF NOT EXISTS employees (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID NOT NULL REFERENCES sites (uid),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_site, key)
);

CREATE INDEX IF NOT EXISTS idx_employees_site ON employees (fk_site);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fk_employee UUID REFERENCES employees (uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_fk_employee
  ON users (fk_employee)
  WHERE fk_employee IS NOT NULL;
