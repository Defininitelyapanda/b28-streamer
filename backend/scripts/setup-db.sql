-- Idempotent setup for B28 Oncodex (run as PostgreSQL superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'b28') THEN
    CREATE USER b28 WITH PASSWORD 'b28';
  END IF;
END
$$;

SELECT 'CREATE DATABASE b28_oncodex OWNER b28'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'b28_oncodex')\gexec

GRANT ALL PRIVILEGES ON DATABASE b28_oncodex TO b28;
