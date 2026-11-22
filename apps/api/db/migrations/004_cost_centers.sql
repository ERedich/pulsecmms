CREATE TABLE IF NOT EXISTS cost_centers (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID NOT NULL REFERENCES sites (uid),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_site, key)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_site ON cost_centers (fk_site);
