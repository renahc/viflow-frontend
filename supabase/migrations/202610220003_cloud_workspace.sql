-- Apply after 202610220002_private_boards.sql. No local boards are imported.
begin;
alter table public.board_columns add column client_key text;
alter table public.cards add column client_key text;
alter table public.board_labels add column client_key text;
alter table public.card_comments add column client_key text;
update public.board_columns set client_key = id::text;
update public.cards set client_key = id::text;
update public.board_labels set client_key = id::text;
update public.card_comments set client_key = id::text;
alter table public.board_columns add constraint columns_client_key unique(board_id, client_key);
alter table public.cards add constraint cards_client_key unique(board_id, client_key);
alter table public.board_labels add constraint labels_client_key unique(board_id, client_key);
alter table public.card_comments add constraint comments_client_key unique(board_id, client_key);
-- Keys are local references, never identity or authorization. Direct API inserts
-- still work; RPC-created rows use stable keys such as the initial 'done' column.
create table viflow_private.workspace_operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, operation_id)
);
alter table viflow_private.workspace_operations enable row level security;
revoke all on viflow_private.workspace_operations from public, anon, authenticated;

create function public.viflow_load_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not viflow_private.verified_user() then raise exception 'Verified session required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'boards', coalesce(jsonb_agg(jsonb_build_object(
      '_columnTitles', (select coalesce(jsonb_object_agg(c.id::text,c.title),'{}') from public.board_columns c where c.board_id=b.id),
      'id', b.id, 'title', b.title, 'archivedAt', b.archived_at,
      'columns', (select coalesce(jsonb_agg(jsonb_build_object('id', coalesce(c.client_key,c.id::text), 'title', c.title, 'description', c.description, 'color', c.color, 'sort', c.sort_mode) order by c.position,c.id), '[]') from public.board_columns c where c.board_id=b.id and c.archived_at is null),
      'labels', (select coalesce(jsonb_agg(jsonb_build_object('id',coalesce(l.client_key,l.id::text),'name',l.name,'color',l.color) order by l.id), '[]') from public.board_labels l where l.board_id=b.id),
      'cards', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', coalesce(c.client_key,c.id::text), 'title', c.title, 'description', c.description,
        'status', coalesce(col.client_key,col.id::text), 'priority',c.priority,'dueDate',c.due_date,'archivedAt',c.archived_at,
        'labelIds',(select coalesce(jsonb_agg(coalesce(l.client_key,l.id::text) order by l.id),'[]') from public.card_labels cl join public.board_labels l on l.id=cl.label_id where cl.card_id=c.id and cl.board_id=b.id),
        'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',coalesce(cm.client_key,cm.id::text),'author',cm.author_name,'body',cm.body,'createdAt',cm.created_at) order by cm.created_at desc,cm.id),'[]') from public.card_comments cm where cm.card_id=c.id and cm.board_id=b.id),
        'activity',(select coalesce(jsonb_agg(jsonb_build_object('id',ac.id,'actor',ac.actor_name,'kind',ac.kind,'details',ac.details,'createdAt',ac.created_at) order by ac.created_at desc,ac.id),'[]') from public.card_activity ac where ac.card_id=c.id and ac.board_id=b.id)
      ) order by c.position,c.id),'[]') from public.cards c join public.board_columns col on col.id=c.column_id and col.board_id=b.id where c.board_id=b.id)
    ) order by b.position,b.id),'[]'),
    'revisions',coalesce(jsonb_object_agg(b.id::text,b.revision),'{}')
  ) into result from public.boards b where b.owner_id=auth.uid();
  return result;
end;
$$;

create function public.viflow_save_workspace(p_changes jsonb, p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item jsonb; payload jsonb; element jsonb; comment_data jsonb; card_data jsonb;
  board_uuid uuid; column_uuid uuid; card_uuid uuid; label_uuid uuid;
  current_owner uuid; current_revision bigint; expected_revision bigint; old_hash text;
  key_value text; index_value integer; uid uuid := auth.uid();
begin
  if not viflow_private.verified_user() then raise exception 'Verified session required' using errcode='42501'; end if;
  if p_operation_id is null or jsonb_typeof(p_changes) is distinct from 'array' or octet_length(p_changes::text)>10485760 then
    raise exception 'Invalid workspace request' using errcode='22023'; end if;
  -- One transaction per account; revisions are checked while holding the lock.
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select payload_hash into old_hash from viflow_private.workspace_operations where owner_id=uid and operation_id=p_operation_id;
  if found then
    if old_hash <> md5(p_changes::text) then raise exception 'Operation payload changed' using errcode='22023'; end if;
    return public.viflow_load_workspace();
  end if;
  for item in select value from jsonb_array_elements(p_changes) loop
    payload := item->'board'; board_uuid := (payload->>'id')::uuid;
    expected_revision := (item->>'expectedRevision')::bigint;
    if expected_revision is null or expected_revision<0 or board_uuid is null then raise exception 'Missing revision or board ID' using errcode='22023'; end if;
    select owner_id, revision into current_owner,current_revision from public.boards where id=board_uuid for update;
    if found then
      if current_owner<>uid then raise exception 'Board access denied' using errcode='42501'; end if;
      if current_revision<>expected_revision then raise exception 'workspace_conflict' using errcode='40001'; end if;
    elsif expected_revision<>0 then raise exception 'workspace_conflict' using errcode='40001';
    end if;
    if jsonb_typeof(payload->'columns') is distinct from 'array' or jsonb_typeof(payload->'cards') is distinct from 'array' or jsonb_typeof(payload->'labels') is distinct from 'array' then
      raise exception 'Invalid board content' using errcode='22023'; end if;
    -- Every existing card must remain in the snapshot, including archived cards.
    if exists(select 1 from public.cards c where c.board_id=board_uuid and not exists(select 1 from jsonb_array_elements(payload->'cards') v where v->>'id'=coalesce(c.client_key,c.id::text))) then
      raise exception 'Cards must be archived, not removed' using errcode='22023'; end if;
    insert into public.boards(id,owner_id,title,position,archived_at) values (board_uuid,uid,payload->>'title',(item->>'position')::integer,(payload->>'archivedAt')::timestamptz)
    on conflict(id) do update set title=excluded.title, position=excluded.position, archived_at=excluded.archived_at
    where (boards.title,boards.position,boards.archived_at) is distinct from (excluded.title,excluded.position,excluded.archived_at);
    index_value:=0;
    for element in select value from jsonb_array_elements(payload->'columns') loop
      key_value:=element->>'id';
      if key_value is null or length(key_value) not between 1 and 128 then raise exception 'Invalid column key' using errcode='22023'; end if;
      insert into public.board_columns(board_id,client_key,title,description,color,sort_mode,position) values
        (board_uuid,key_value,element->>'title',coalesce(element->>'description',''),element->>'color',coalesce(element->>'sort','manual'),index_value)
      on conflict(board_id,client_key) do update set title=excluded.title,description=excluded.description,color=excluded.color,sort_mode=excluded.sort_mode,position=excluded.position,archived_at=null
      where (board_columns.title,board_columns.description,board_columns.color,board_columns.sort_mode,board_columns.position,board_columns.archived_at) is distinct from (excluded.title,excluded.description,excluded.color,excluded.sort_mode,excluded.position,null::timestamptz);
      index_value:=index_value+1;
    end loop;
    delete from public.board_labels l where l.board_id=board_uuid and not exists(select 1 from jsonb_array_elements(payload->'labels') v where v->>'id'=coalesce(l.client_key,l.id::text));
    for element in select value from jsonb_array_elements(payload->'labels') loop
      key_value:=element->>'id';
      if key_value is null or length(key_value) not between 1 and 128 then raise exception 'Invalid label key' using errcode='22023'; end if;
      insert into public.board_labels(board_id,client_key,name,color) values(board_uuid,key_value,element->>'name',element->>'color')
      on conflict(board_id,client_key) do update set name=excluded.name,color=excluded.color
      where (board_labels.name,board_labels.color) is distinct from (excluded.name,excluded.color);
    end loop;
    index_value:=0;
    for card_data in select value from jsonb_array_elements(payload->'cards') loop
      key_value:=card_data->>'id';
      if key_value is null or length(key_value) not between 1 and 128 then raise exception 'Invalid card key' using errcode='22023'; end if;
      select id into column_uuid from public.board_columns where board_id=board_uuid and coalesce(client_key,id::text)=card_data->>'status';
      if column_uuid is null then raise exception 'Invalid card column' using errcode='23503'; end if;
      insert into public.cards(board_id,client_key,column_id,title,description,priority,due_date,position,archived_at) values
        (board_uuid,key_value,column_uuid,card_data->>'title',coalesce(card_data->>'description',''),coalesce(card_data->>'priority','none'),(card_data->>'dueDate')::date,index_value,(card_data->>'archivedAt')::timestamptz)
      on conflict(board_id,client_key) do update set column_id=excluded.column_id,title=excluded.title,description=excluded.description,priority=excluded.priority,due_date=excluded.due_date,position=excluded.position,archived_at=excluded.archived_at
      where (cards.column_id,cards.title,cards.description,cards.priority,cards.due_date,cards.position,cards.archived_at) is distinct from (excluded.column_id,excluded.title,excluded.description,excluded.priority,excluded.due_date,excluded.position,excluded.archived_at);
      select id into card_uuid from public.cards where board_id=board_uuid and coalesce(client_key,id::text)=key_value;
      delete from public.card_labels cl where cl.board_id=board_uuid and cl.card_id=card_uuid and not exists (
        select 1 from public.board_labels l, jsonb_array_elements_text(coalesce(card_data->'labelIds','[]')) k where l.board_id=board_uuid and l.id=cl.label_id and coalesce(l.client_key,l.id::text)=k.value
      );
      for element in select value from jsonb_array_elements(coalesce(card_data->'labelIds','[]')) loop
        select id into label_uuid from public.board_labels where board_id=board_uuid and coalesce(client_key,id::text)=element#>>'{}';
        if label_uuid is null then raise exception 'Invalid card label' using errcode='23503'; end if;
        insert into public.card_labels values(board_uuid,card_uuid,label_uuid) on conflict do nothing;
      end loop;
      for comment_data in select value from jsonb_array_elements(coalesce(card_data->'comments','[]')) loop
        key_value:=comment_data->>'id';
        if key_value is null or length(key_value) not between 1 and 128 then raise exception 'Invalid comment key' using errcode='22023'; end if;
        -- Existing comments are immutable; supplied author/date/activity are ignored.
        if exists(select 1 from public.card_comments where board_id=board_uuid and client_key=key_value and card_id<>card_uuid) then raise exception 'Invalid comment card' using errcode='23503'; end if;
        if not exists(select 1 from public.card_comments where board_id=board_uuid and coalesce(client_key,id::text)=key_value) then
          insert into public.card_comments(board_id,card_id,client_key,body,author_name) values(board_uuid,card_uuid,key_value,comment_data->>'body','Tu cuenta');
        end if;
      end loop;
      index_value:=index_value+1;
    end loop;
    update public.board_columns c set archived_at=clock_timestamp() where c.board_id=board_uuid and c.archived_at is null and not exists(select 1 from jsonb_array_elements(payload->'columns') v where v->>'id'=coalesce(c.client_key,c.id::text));
  end loop;
  insert into viflow_private.workspace_operations(owner_id,operation_id,payload_hash) values(uid,p_operation_id,md5(p_changes::text));
  return public.viflow_load_workspace();
end;
$$;
revoke all on function public.viflow_load_workspace(),public.viflow_save_workspace(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.viflow_load_workspace(),public.viflow_save_workspace(jsonb,uuid) to authenticated;
revoke insert, update, delete on public.boards, public.board_columns, public.cards, public.board_labels, public.card_labels, public.card_comments from authenticated;
do $$
declare table_name text; columns_sql text;
begin
  foreach table_name in array array['boards','board_columns','cards','board_labels','card_labels','card_comments'] loop
    select string_agg(quote_ident(a.attname), ',') into columns_sql from pg_attribute a
      where a.attrelid=format('public.%I',table_name)::regclass and a.attnum>0 and not a.attisdropped;
    execute format('revoke insert (%s), update (%s) on public.%I from authenticated',columns_sql,columns_sql,table_name);
  end loop;
end;
$$;
commit;
