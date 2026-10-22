-- Apply once after the avatar migration. Transactional: errors roll back all changes.
-- Content remains local until the cloud repository is connected in a later delivery.
begin;
create schema if not exists viflow_private;
revoke all on schema viflow_private from public;
grant usage on schema viflow_private to authenticated;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_owner_order on public.boards(owner_id, position, id);

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  description text not null default '' check (length(description) <= 1000),
  color text check (color in ('purple', 'rose', 'blue', 'teal', 'amber', 'slate')),
  sort_mode text not null default 'manual' check (sort_mode in ('manual', 'priority')),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  unique (board_id, id)
);
create index board_columns_order on public.board_columns(board_id, position, id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 1000),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  due_date date check (due_date between date '0001-01-01' and date '9999-12-31'),
  position integer not null default 0 check (position >= 0),
  archived_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, id),
  foreign key (board_id, column_id) references public.board_columns(board_id, id)
);
create index cards_column_order on public.cards(board_id, column_id, position, id);

create table public.board_labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 32),
  color text not null check (color in ('purple', 'rose', 'blue', 'teal', 'amber', 'slate')),
  unique (board_id, id)
);
create unique index board_labels_unique_name on public.board_labels(board_id, lower(btrim(name)));
create table public.card_labels (
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null,
  label_id uuid not null,
  primary key (board_id, card_id, label_id),
  foreign key (board_id, card_id) references public.cards(board_id, id) on delete cascade,
  foreign key (board_id, label_id) references public.board_labels(board_id, id) on delete cascade
);
create index card_labels_label on public.card_labels(board_id, label_id);

create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null check (length(btrim(author_name)) between 1 and 60),
  body text not null check (length(btrim(body)) between 1 and 2000),
  source text not null default 'account' check (source in ('account', 'local_import')),
  created_at timestamptz not null default now(),
  foreign key (board_id, card_id) references public.cards(board_id, id) on delete cascade,
  check (source <> 'local_import' or author_id is null)
);
create index card_comments_timeline on public.card_comments(board_id, card_id, created_at desc, id);

create table public.card_activity (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null check (length(btrim(actor_name)) between 1 and 60),
  kind text not null check (kind in ('archived', 'restored', 'due-date-edited', 'priority-edited', 'created', 'moved', 'reordered', 'title-edited', 'description-edited', 'label-added', 'label-removed')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  source text not null default 'account' check (source in ('account', 'local_import')),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (board_id, card_id) references public.cards(board_id, id) on delete cascade,
  check (source <> 'local_import' or actor_id is null)
);
create index card_activity_timeline on public.card_activity(board_id, card_id, created_at desc, id);

-- Read confirmation from Auth's protected table, never editable user_metadata/JWT flags.
create function viflow_private.verified_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id = (select auth.uid()) and email_confirmed_at is not null);
$$;
create function viflow_private.owns_board(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select viflow_private.verified_user() and exists (
    select 1 from public.boards where id = target and owner_id = (select auth.uid())
  );
$$;
create function viflow_private.actor_name() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select case when length(btrim(raw_user_meta_data->>'display_name')) between 1 and 60
    then btrim(raw_user_meta_data->>'display_name') end from auth.users where id = (select auth.uid())), 'Tu cuenta');
$$;

create function viflow_private.increment_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger boards_revision before update on public.boards
for each row execute function viflow_private.increment_revision();
create trigger cards_revision before update on public.cards
for each row execute function viflow_private.increment_revision();

create function viflow_private.touch_parent_board() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.boards set updated_at = clock_timestamp() where id = old.board_id;
    return old;
  end if;
  update public.boards set updated_at = clock_timestamp() where id = new.board_id;
  return new;
end;
$$;

create function viflow_private.stamp_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not viflow_private.owns_board(new.board_id) then
    raise exception 'Board access denied' using errcode = '42501';
  end if;
  new.author_id := auth.uid();
  new.author_name := viflow_private.actor_name();
  new.created_at := clock_timestamp();
  new.source := 'account';
  return new;
end;
$$;
create trigger stamp_comment before insert on public.card_comments
for each row execute function viflow_private.stamp_comment();

create function viflow_private.record_card_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare entry_kind text; changes jsonb;
begin
  if tg_op = 'INSERT' then entry_kind := 'created'; changes := jsonb_build_object('column_id', new.column_id);
  else
    changes := '{}'::jsonb;
    if new.column_id is distinct from old.column_id then
      changes := changes || jsonb_build_object('column_id', jsonb_build_object('from', old.column_id, 'to', new.column_id)); entry_kind := 'moved';
    end if;
    if new.position is distinct from old.position then
      changes := changes || jsonb_build_object('position', new.position); entry_kind := coalesce(entry_kind, 'reordered');
    end if;
    if new.title is distinct from old.title then changes := changes || jsonb_build_object('title', new.title); entry_kind := coalesce(entry_kind, 'title-edited'); end if;
    if new.description is distinct from old.description then changes := changes || jsonb_build_object('description_changed', true); entry_kind := coalesce(entry_kind, 'description-edited'); end if;
    if new.priority is distinct from old.priority then changes := changes || jsonb_build_object('priority', new.priority); entry_kind := coalesce(entry_kind, 'priority-edited'); end if;
    if new.due_date is distinct from old.due_date then changes := changes || jsonb_build_object('due_date', new.due_date); entry_kind := coalesce(entry_kind, 'due-date-edited'); end if;
    if new.archived_at is distinct from old.archived_at then changes := changes || jsonb_build_object('archived_at', new.archived_at); entry_kind := case when new.archived_at is null then 'restored' else 'archived' end; end if;
    if entry_kind is null then return new; end if;
  end if;
  insert into public.card_activity(board_id, card_id, actor_id, actor_name, kind, details)
    values (new.board_id, new.id, auth.uid(), viflow_private.actor_name(), entry_kind, changes);
  return new;
end;
$$;
create trigger record_card_activity after insert or update on public.cards
for each row execute function viflow_private.record_card_activity();

-- Assignment history is also server-generated. A label deletion records its
-- name before cascading assignments disappear, so history retains that context.
create function viflow_private.record_label_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare label_name text;
begin
  if tg_table_name = 'board_labels' then
    insert into public.card_activity(board_id, card_id, actor_id, actor_name, kind, details)
      select old.board_id, assignment.card_id, auth.uid(), viflow_private.actor_name(),
        'label-removed', jsonb_build_object('label_name', old.name, 'deleted_from_board', true)
      from public.card_labels assignment where assignment.board_id = old.board_id and assignment.label_id = old.id;
    return old;
  elsif tg_op = 'INSERT' then
    select name into label_name from public.board_labels where board_id = new.board_id and id = new.label_id;
    insert into public.card_activity(board_id, card_id, actor_id, actor_name, kind, details)
      values (new.board_id, new.card_id, auth.uid(), viflow_private.actor_name(), 'label-added', jsonb_build_object('label_name', label_name));
    return new;
  end if;
  select name into label_name from public.board_labels where board_id = old.board_id and id = old.label_id;
  if label_name is not null then
    insert into public.card_activity(board_id, card_id, actor_id, actor_name, kind, details)
      values (old.board_id, old.card_id, auth.uid(), viflow_private.actor_name(), 'label-removed', jsonb_build_object('label_name', label_name));
  end if;
  return old;
end;
$$;
create trigger record_label_assignment after insert or delete on public.card_labels
for each row execute function viflow_private.record_label_activity();
create trigger record_label_deletion before delete on public.board_labels
for each row execute function viflow_private.record_label_activity();

-- No implicit table privileges, including Supabase's default grants.
revoke all on public.boards, public.board_columns, public.cards, public.board_labels,
  public.card_labels, public.card_comments, public.card_activity from public, anon, authenticated;

grant select on public.boards, public.board_columns, public.cards, public.board_labels,
  public.card_labels, public.card_comments, public.card_activity to authenticated;
-- Server-owned IDs/owners/timestamps/revisions and author fields cannot be supplied or edited.
grant insert (title, position, archived_at) on public.boards to authenticated;
grant update (title, position, archived_at) on public.boards to authenticated;
grant insert (board_id, title, description, color, sort_mode, position, archived_at) on public.board_columns to authenticated;
grant update (title, description, color, sort_mode, position, archived_at) on public.board_columns to authenticated;
grant insert (board_id, column_id, title, description, priority, due_date, position, archived_at) on public.cards to authenticated;
grant update (column_id, title, description, priority, due_date, position, archived_at) on public.cards to authenticated;
grant insert (board_id, name, color) on public.board_labels to authenticated;
grant update (name, color) on public.board_labels to authenticated;
grant delete on public.board_labels to authenticated;
grant insert (board_id, card_id, label_id) on public.card_labels to authenticated;
grant delete on public.card_labels to authenticated;
grant insert (board_id, card_id, body) on public.card_comments to authenticated;
-- Comments/activity are append-only. No hard deletes of boards, cards or columns.

do $$
declare table_name text;
begin
  foreach table_name in array array['boards', 'board_columns', 'cards', 'board_labels', 'card_labels', 'card_comments', 'card_activity'] loop
    execute format('alter table public.%I enable row level security', table_name);
    if table_name = 'boards' then
      execute 'create policy boards_owner on public.boards for all to authenticated using (owner_id = (select auth.uid()) and (select viflow_private.verified_user())) with check (owner_id = (select auth.uid()) and (select viflow_private.verified_user()))';
    else
      execute format('create policy %I on public.%I for all to authenticated using (viflow_private.owns_board(board_id)) with check (viflow_private.owns_board(board_id))', table_name || '_owner', table_name);
      execute format('create trigger touch_board after insert or update or delete on public.%I for each row execute function viflow_private.touch_parent_board()', table_name);
    end if;
  end loop;
end;
$$;
revoke all on all functions in schema viflow_private from public, anon, authenticated;
grant execute on function viflow_private.verified_user(), viflow_private.owns_board(uuid) to authenticated;
-- Trigger helpers remain uncallable through the API; keep this schema unexposed.
commit;
