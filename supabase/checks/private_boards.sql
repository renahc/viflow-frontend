-- Read-only installation checks. Run after the private boards migration.
-- 1: Seven tables, all with rowsecurity = true.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in
  ('boards', 'board_columns', 'cards', 'board_labels', 'card_labels', 'card_comments', 'card_activity')
order by tablename;

-- 2: Seven ownership policies. These are metadata checks, not a substitute for RLS tests.
select tablename, policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename in
  ('boards', 'board_columns', 'cards', 'board_labels', 'card_labels', 'card_comments', 'card_activity')
order by tablename;

-- 3: Must be false: no anonymous access, no forged audit, owner or revisions,
--    and no hard delete of boards/cards/columns through the authenticated API.
select
  has_table_privilege('anon', 'public.boards', 'select') as anonymous_board_read,
  has_table_privilege('authenticated', 'public.card_activity', 'insert') as client_audit_write,
  has_column_privilege('authenticated', 'public.boards', 'owner_id', 'update') as client_owner_change,
  has_column_privilege('authenticated', 'public.boards', 'revision', 'update') as client_revision_change,
  has_table_privilege('authenticated', 'public.boards', 'delete') as client_board_delete,
  has_table_privilege('authenticated', 'public.cards', 'delete') as client_card_delete,
  has_table_privilege('authenticated', 'public.board_columns', 'delete') as client_column_delete;
