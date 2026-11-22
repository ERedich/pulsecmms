ALTER TABLE users
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE users
SET email = lower(login_name) || '@example.local'
WHERE email IS NULL OR btrim(email) = '';

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
