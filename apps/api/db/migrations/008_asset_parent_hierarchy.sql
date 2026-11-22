-- Drop unnamed/auto-named check constraints on assets, then recreate.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'assets'::regclass
      AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE assets DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE assets
  ADD CONSTRAINT assets_type_check CHECK (
    type IN (
      'location',
      'building',
      'area',
      'assembly',
      'maintenance_object'
    )
  );

-- Location may be root or nested under another location (or equal/higher parent).
-- All other types require a parent. Parent type rank is enforced in the API.
ALTER TABLE assets
  ADD CONSTRAINT assets_parent_required_check CHECK (
    type = 'location' OR fk_parent IS NOT NULL
  );
