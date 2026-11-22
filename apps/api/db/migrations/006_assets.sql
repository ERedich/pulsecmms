CREATE TABLE IF NOT EXISTS assets (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  fk_site UUID NOT NULL REFERENCES sites (uid),
  type TEXT NOT NULL,
  fk_parent UUID REFERENCES assets (uid) ON DELETE RESTRICT,
  fk_cost_center UUID NOT NULL REFERENCES cost_centers (uid) ON DELETE RESTRICT,
  serial_number TEXT,
  manufacturer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fk_site, key),
  CHECK (
    type IN (
      'location',
      'building',
      'area',
      'assembly',
      'maintenance_object'
    )
  ),
  CHECK (
    (type = 'location' AND fk_parent IS NULL)
    OR (type <> 'location' AND fk_parent IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_assets_site ON assets (fk_site);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets (fk_parent);
CREATE INDEX IF NOT EXISTS idx_assets_cost_center ON assets (fk_cost_center);
