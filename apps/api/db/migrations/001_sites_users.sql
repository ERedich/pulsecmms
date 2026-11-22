CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID NOT NULL REFERENCES sites (uid),
  login_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_site, key),
  UNIQUE (fk_site, login_name)
);

CREATE TABLE IF NOT EXISTS user_secondary_sites (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID NOT NULL REFERENCES sites (uid),
  fk_user UUID NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
  fk_secondary_site UUID NOT NULL REFERENCES sites (uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_user, fk_secondary_site),
  UNIQUE (fk_site, key),
  CHECK (fk_secondary_site <> fk_site)
);

CREATE INDEX IF NOT EXISTS idx_users_login_name ON users (login_name);
CREATE INDEX IF NOT EXISTS idx_user_secondary_sites_user ON user_secondary_sites (fk_user);
