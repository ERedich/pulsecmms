ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS color_code TEXT;

UPDATE sites
SET color_code = CASE key
  WHEN 'DEMO' THEN '#2563EB'
  WHEN 'NORD' THEN '#0D9488'
  ELSE '#64748B'
END
WHERE color_code IS NULL OR btrim(color_code) = '';

ALTER TABLE sites
  ALTER COLUMN color_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sites_color_code_hex_check'
  ) THEN
    ALTER TABLE sites
      ADD CONSTRAINT sites_color_code_hex_check
      CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;
