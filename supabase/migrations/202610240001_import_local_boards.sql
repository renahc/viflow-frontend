-- Apply once after 202610220003_cloud_workspace.sql. No imports run automatically.
begin;
create table viflow_private.local_board_imports (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload_hash text not null,
  board_ids jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id, operation_id)
);
alter table viflow_private.local_board_imports enable row level security;
revoke all on viflow_private.local_board_imports from public,anon,authenticated;

-- Local history can be written only by the import RPC below. API callers have
-- no INSERT privileges; the ordinary save RPC never supplies local_import.
create or replace function viflow_private.stamp_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not viflow_private.owns_board(new.board_id) then raise exception 'Board access denied' using errcode='42501'; end if;
  if new.source='local_import' then
    if new.author_id is not null or not isfinite(new.created_at) then raise exception 'Invalid local history' using errcode='22023'; end if;
    return new;
  end if;
  new.author_id:=auth.uid(); new.author_name:=viflow_private.actor_name();
  new.created_at:=clock_timestamp(); new.source:='account';
  return new;
end;
$$;
create or replace function public.viflow_load_workspace() returns jsonb
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
        'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',coalesce(cm.client_key,cm.id::text),'source',cm.source,'author',cm.author_name,'body',cm.body,'createdAt',cm.created_at) order by cm.created_at desc,cm.id),'[]') from public.card_comments cm where cm.card_id=c.id and cm.board_id=b.id),
        'activity',(select coalesce(jsonb_agg(jsonb_build_object('id',ac.id,'source',ac.source,'actor',ac.actor_name,'kind',ac.kind,'details',ac.details,'createdAt',ac.created_at) order by ac.created_at desc,ac.id),'[]') from public.card_activity ac where ac.card_id=c.id and ac.board_id=b.id)
      ) order by c.position,c.id),'[]') from public.cards c join public.board_columns col on col.id=c.column_id and col.board_id=b.id where c.board_id=b.id)
    ) order by b.position,b.id),'[]'),
    'revisions',coalesce(jsonb_object_agg(b.id::text,b.revision),'{}')
  ) into result from public.boards b where b.owner_id=auth.uid();
  return result;
end;
$$;

create function public.viflow_import_local_boards(p_boards jsonb,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); previous_hash text; imported_ids jsonb:='[]'; changes jsonb:='[]';
  original jsonb; clean_board jsonb; source_card jsonb; history jsonb; entry jsonb;
  board_uuid uuid; card_uuid uuid; position_value integer; board_index integer:=0; table_key text;
begin
  if not viflow_private.verified_user() then raise exception 'Verified session required' using errcode='42501'; end if;
  if p_operation_id is null or jsonb_typeof(p_boards) is distinct from 'array' then raise exception 'Invalid import' using errcode='22023'; end if;
  if jsonb_array_length(p_boards) not between 1 and 100 or octet_length(p_boards::text)>10485760 then raise exception 'Import exceeds limits' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select payload_hash,board_ids into previous_hash,imported_ids from viflow_private.local_board_imports where owner_id=uid and operation_id=p_operation_id;
  if found then
    if previous_hash<>md5(p_boards::text) then raise exception 'Import payload changed' using errcode='22023'; end if;
    return public.viflow_load_workspace() || jsonb_build_object('importedBoardIds',imported_ids);
  end if;
  imported_ids:='[]';
  select coalesce(max(position)+1,0) into position_value from public.boards where owner_id=uid;
  for original in select value from jsonb_array_elements(p_boards) loop
    foreach table_key in array array['columns','cards','labels'] loop
      if jsonb_typeof(original->table_key) is distinct from 'array' then raise exception 'Invalid board arrays' using errcode='22023'; end if;
      if exists(select 1 from jsonb_array_elements(original->table_key) v where v->>'id' is null or length(v->>'id') not between 1 and 128)
        or (select count(*)<>count(distinct v->>'id') from jsonb_array_elements(original->table_key) v) then
        raise exception 'Invalid or duplicate references' using errcode='22023'; end if;
    end loop;
    -- New board UUID and fresh database UUIDs for all children. Local keys only
    -- preserve relationships inside this new board; source board IDs are ignored.
    board_uuid:=gen_random_uuid();
    clean_board:=original || jsonb_build_object('id',board_uuid,'cards',(
      select coalesce(jsonb_agg((c-'activity'-'comments') || jsonb_build_object('comments','[]'::jsonb)),'[]') from jsonb_array_elements(original->'cards') c
    ));
    changes:=changes || jsonb_build_array(jsonb_build_object('board',clean_board,'expectedRevision',0,'position',position_value));
    imported_ids:=imported_ids || jsonb_build_array(board_uuid);
    position_value:=position_value+1;
  end loop;
  perform public.viflow_save_workspace(changes,p_operation_id);
  for original in select value from jsonb_array_elements(p_boards) loop
    board_uuid:=(imported_ids->>board_index)::uuid;
    -- Remove synthetic creation/assignment events for these NEW imported copies.
    delete from public.card_activity where board_id=board_uuid;
    for source_card in select value from jsonb_array_elements(original->'cards') loop
      select id into card_uuid from public.cards where board_id=board_uuid and client_key=source_card->>'id';
      if not exists(select 1 from public.board_columns where board_id=board_uuid and client_key=source_card->>'status' and archived_at is null) then
        raise exception 'Invalid imported column reference' using errcode='23503'; end if;
      history:=coalesce(source_card->'comments','[]');
      if jsonb_typeof(history) is distinct from 'array' then raise exception 'Invalid comments' using errcode='22023'; end if;
      for entry in select value from jsonb_array_elements(history) loop
        if not isfinite((entry->>'createdAt')::timestamptz) then raise exception 'Invalid comment date' using errcode='22023'; end if;
        insert into public.card_comments(board_id,card_id,client_key,author_id,author_name,body,source,created_at)
          values(board_uuid,card_uuid,gen_random_uuid()::text,null,entry->>'author',entry->>'body','local_import',(entry->>'createdAt')::timestamptz);
      end loop;
      history:=coalesce(source_card->'activity','[]');
      if jsonb_typeof(history) is distinct from 'array' then raise exception 'Invalid activity' using errcode='22023'; end if;
      for entry in select value from jsonb_array_elements(history) loop
        if not isfinite((entry->>'createdAt')::timestamptz) or nullif(btrim(entry->>'message'),'') is null then raise exception 'Invalid activity history' using errcode='22023'; end if;
        insert into public.card_activity(board_id,card_id,actor_id,actor_name,kind,details,source,created_at)
          values(board_uuid,card_uuid,null,entry->>'actor',entry->>'kind',jsonb_build_object('imported_message',entry->>'message'),'local_import',(entry->>'createdAt')::timestamptz);
      end loop;
    end loop;
    board_index:=board_index+1;
  end loop;
  insert into viflow_private.local_board_imports(owner_id,operation_id,payload_hash,board_ids) values(uid,p_operation_id,md5(p_boards::text),imported_ids);
  return public.viflow_load_workspace() || jsonb_build_object('importedBoardIds',imported_ids);
end;
$$;
revoke all on function public.viflow_import_local_boards(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.viflow_import_local_boards(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
