# ADR 0002: Local PostgreSQL through the `pg` driver, Supabase later

- Status: Accepted for the prototype (2026-11-25)
- Context: The team wants to run on PostgreSQL on their own computer first, then move to Supabase. The app already has a `Store` interface with a JSON-file store and a Supabase store. The FDE standard prefers Drizzle ORM.
- Decision: Add `lib/store/postgres.ts`, a third `Store` implementation using the `pg` driver and plain SQL. `db/schema.sql` matches `supabase/schema.sql`, so the move to Supabase is a connection change. `DATABASE_URL` takes priority over the Supabase keys. Drizzle is not added yet, to avoid a second schema definition while the Supabase client is still in use.
- Consequences: There are no versioned migrations yet. `db/schema.sql` is idempotent (`create table if not exists`), and `db:reset` is for demo data only. Adopt Drizzle migrations (or Supabase migrations) before any real data is stored.
