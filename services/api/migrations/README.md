Postgres migrations directory.

Apply migrations in order. Example using psql or a migration tool:

psql $DATABASE_URL -f 001_initial_schema.sql

Ensure `pgcrypto` extension is enabled for gen_random_uuid().
