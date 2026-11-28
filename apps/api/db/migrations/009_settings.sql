CREATE TABLE IF NOT EXISTS settings (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID REFERENCES sites (uid),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_global_key
  ON settings (key)
  WHERE fk_site IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_site_key
  ON settings (fk_site, key)
  WHERE fk_site IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settings_site ON settings (fk_site);
